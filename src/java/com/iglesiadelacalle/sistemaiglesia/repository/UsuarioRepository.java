package com.iglesiadelacalle.sistemaiglesia.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.iglesiadelacalle.sistemaiglesia.models.Usuario;

@Repository
public interface UsuarioRepository extends JpaRepository<Usuario, Integer> {
    
    // Spring Boot crea las consultas SQL automáticamente solo con leer estos nombres:
    boolean existsByCorreo(String correo);
    boolean existsByNombreUser(String nombreUser);
    boolean existsByPersona_Cedula(Integer cedula); 
    
}