package com.iglesiadelacalle.sistemaiglesia.models;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.PrePersist;

import java.time.ZoneId;
import java.time.LocalDate;

@Entity
@Table(name = "persona")
public class Persona {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer idPersona;

    @Column(length = 50, nullable = false)
    private String nombre;

    @Column(length = 50, nullable = false)
    private String apellido;

    private Integer cedula;

    @Column(length = 1, nullable = false)
    private String genero;

    @Column(length = 1, nullable = false)
    private String nacionalidad;

    @Column(name = "fecha_creacion", updatable = false)
    private LocalDate fechaCreacion;

    // ⚡ NUEVOS CAMPOS PARA INVITADOS ⚡
    @Column(length = 150)
    private String congregacion;

    @Column(length = 150)
    private String ubicacion;

    @PrePersist
    protected void onCreate() {
        this.fechaCreacion = LocalDate.now(ZoneId.of("America/Caracas"));
    }

    // --- GETTERS Y SETTERS ---

    public Integer getIdPersona() { return idPersona; }
    public void setIdPersona(Integer idPersona) { this.idPersona = idPersona; }

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    public String getApellido() { return apellido; }
    public void setApellido(String apellido) { this.apellido = apellido; }

    public Integer getCedula() { return cedula; }
    public void setCedula(Integer cedula) { this.cedula = cedula; }

    public String getGenero() { return genero; }
    public void setGenero(String genero) { this.genero = genero; }

    public String getNacionalidad() { return nacionalidad; }
    public void setNacionalidad(String nacionalidad) { this.nacionalidad = nacionalidad; }

    public LocalDate getFechaCreacion() { return fechaCreacion; }
    public void setFechaCreacion(LocalDate fechaCreacion) { this.fechaCreacion = fechaCreacion; }

    public String getCongregacion() { return congregacion; }
    public void setCongregacion(String congregacion) { this.congregacion = congregacion; }

    public String getUbicacion() { return ubicacion; }
    public void setUbicacion(String ubicacion) { this.ubicacion = ubicacion; }
}