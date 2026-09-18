package com.iglesiadelacalle.sistemaiglesia.models;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

// Importa esto al principio del archivo
    import java.time.ZoneId;
    import java.time.LocalDate;

@Entity
@Table(name = "usuario")
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer idUsuario; // Le agregamos un ID propio para que Spring Boot sea feliz

    public Integer getIdUsuario() {
        return idUsuario;
    }

    public void setIdUsuario(Integer idUsuario) {
        this.idUsuario = idUsuario;
    }

    public Persona getPersona() {
        return persona;
    }

    public void setPersona(Persona persona) {
        this.persona = persona;
    }

    public String getNombreUser() {
        return nombreUser;
    }

    public void setNombreUser(String nombreUser) {
        this.nombreUser = nombreUser;
    }

    public String getPasswork() {
        return passwork;
    }

    public void setPasswork(String passwork) {
        this.passwork = passwork;
    }

  
    @Column(length = 100, nullable = false)
    private String correo;

    public String getCorreo() {
        return correo;
    }

    public void setCorreo(String correo) {
        this.correo = correo;
    }

    @OneToOne
    @JoinColumn(name = "id_persona", nullable = false)
    private Persona persona; // Aquí relacionamos al usuario con la tabla Persona

    @Column(name = "nombre_user", length = 20, nullable = false)
    private String nombreUser;

    @Column(length = 20, nullable = false)
    private String passwork;

    
    @Column(length = 20, nullable = false)
    private String estado;

    public String getEstado() {
        return estado;
    }

    public void setEstado(String estado) {
        this.estado = estado;
    }

    @Column(name = "foto_perfil", length = 255, nullable = true)
    private String fotoPerfil;

    public String getFotoPerfil() { return fotoPerfil; }
    public void setFotoPerfil(String fotoPerfil) { this.fotoPerfil = fotoPerfil; }

    @Column(name = "correo_verificado", length = 2, nullable = false)
    private String correoVerificado = "N"; // 'S' para Sí, 'N' para No

    // Getter y Setter
    public String getCorreoVerificado() { return correoVerificado; }
    public void setCorreoVerificado(String correoVerificado) { this.correoVerificado = correoVerificado; }

    @Column(name = "fecha_creacion", updatable = false)
    private java.time.LocalDate fechaCreacion;

    public java.time.LocalDate getFechaCreacion() { return fechaCreacion; }
    public void setFechaCreacion(java.time.LocalDate fechaCreacion) { this.fechaCreacion = fechaCreacion; }

    @jakarta.persistence.PrePersist
    protected void onCreate() {
        // Esto garantiza que no importa donde esté el servidor, 
        // la fecha siempre será la de Caracas, Venezuela.
        this.fechaCreacion = LocalDate.now(ZoneId.of("America/Caracas"));
    }
    
}